cmake_minimum_required(VERSION 3.16)
project(prediction_service CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

find_package(Threads REQUIRED)

# Main Prediction Service executable
add_executable(prediction_service src/main.cpp)
target_link_libraries(prediction_service PRIVATE Threads::Threads)

# Unit test executable
enable_testing()
add_executable(test_prediction tests/test_prediction.cpp)
target_link_libraries(test_prediction PRIVATE Threads::Threads)

add_test(NAME PredictionTests COMMAND test_prediction)
